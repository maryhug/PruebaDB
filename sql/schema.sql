CREATE TABLE customer (
                                 id_customer SERIAL PRIMARY KEY
                                 name VARCHAR(255) NOT NULL,
                                 email VARCHAR(255) UNIQUE NOT NULL,
                                 address TEXT,
                                 city VARCHAR(255) NOT NULL,
                                 phone VARCHAR(20) NOT NULL,
                                 created_at  TIMESTAMP DEFAULT NOW(),
                                 CONSTRAINT customer_pkey PRIMARY KEY (id_customer)
);
CREATE TABLE product (
                                id_product SERIAL PRIMARY KEY,
                                category character varying,
                                sku character varying,
                                id_supplier bigint,
                                created_at  TIMESTAMP DEFAULT NOW(),
                                CONSTRAINT product_pkey PRIMARY KEY (id_product),
                                CONSTRAINT product_id_supplier_fkey FOREIGN KEY (id_supplier) REFERENCES public.supplier(id_supplier)
);
CREATE TABLE product_data (
                                     id_product_data SERIAL PRIMARY KEY,
                                     unit_price bigint,
                                     id_product bigint,
                                     created_at  TIMESTAMP DEFAULT NOW(),
                                     CONSTRAINT product_data_pkey PRIMARY KEY (id_product_data),
                                     CONSTRAINT product_data_id_product_fkey FOREIGN KEY (id_product) REFERENCES public.product(id_product)
);
CREATE TABLE sale (
                             id_sale SERIAL PRIMARY KEY,
                             quantity integer,
                             total_line_value bigint,
                             id_product bigint,
                             id_product_data bigint,
                             created_at  TIMESTAMP DEFAULT NOW(),
                             CONSTRAINT sale_pkey PRIMARY KEY (id_sale),
                             CONSTRAINT sale_id_product_fkey FOREIGN KEY (id_product) REFERENCES public.product(id_product),
                             CONSTRAINT sale_id_product_data_fkey FOREIGN KEY (id_product_data) REFERENCES public.product_data(id_product_data)
);
CREATE TABLE supplier (
                                 id_supplier SERIAL PRIMARY KEY,
                                 name character varying,
                                 email character varying,
                                 created_at  TIMESTAMP DEFAULT NOW(),
                                 CONSTRAINT supplier_pkey PRIMARY KEY (id_supplier)
);
CREATE TABLE transaction (
                                    id_transaction SERIAL PRIMARY KEY,
                                    date date,
                                    id_customer bigint,
                                    id_sale bigint,
                                    created_at  TIMESTAMP DEFAULT NOW(),
                                    CONSTRAINT transaction_pkey PRIMARY KEY (id_transaction),
                                    CONSTRAINT transaction_id_customer_fkey FOREIGN KEY (id_customer) REFERENCES public.customer(id_customer),
                                    CONSTRAINT transaction_id_sale_fkey FOREIGN KEY (id_sale) REFERENCES public.sale(id_sale)
);